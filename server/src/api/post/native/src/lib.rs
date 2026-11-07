use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::hash::Hasher;
use std::path::PathBuf;
use tokio::task::spawn_blocking;
use twox_hash::XxHash64;

const MAX_SIZE: usize = 5 * 1024 * 1024; // 5 МБ

#[napi(object)]
pub struct SaveImageResult {
    pub high: String,
    pub medium: String,
    pub small: String,
    pub vertical: bool,
    pub r#type: String,
}

#[napi(object)]
pub struct SaveImageInput {
    pub medium: String,
    pub small: Option<String>,
}

fn hash_hex(data: &[u8]) -> String {
    let mut hasher = XxHash64::with_seed(0xabcd1234);
    hasher.write(data);
    format!("{:016x}", hasher.finish())
}

fn save_bytes(storage: &PathBuf, src: &str, data: &[u8]) -> std::io::Result<String> {
    let hash = hash_hex(data);
    let dir = storage.join(src).join(&hash[..2]);
    std::fs::create_dir_all(&dir)?;
    std::fs::write(dir.join(format!("{hash}.webp")), data)?;
    Ok(format!("{src}{}/{}", &hash[..2], hash))
}

fn encode_webp(img: &image::DynamicImage, quality: f32) -> Result<Vec<u8>> {
    let encoder = webp::Encoder::from_image(img)
        .map_err(|e| Error::from_reason(format!("ошибка энкодера webp: {e}")))?;
    Ok(encoder.encode(quality).to_vec())
}

#[napi]
pub async fn save_image(
    buffer: Buffer,
    storage_path: String,
    src: String,
) -> Result<SaveImageResult> {
    let data = buffer.to_vec();

    // Валидация: размер
    if data.len() > MAX_SIZE {
        return Err(Error::from_reason("размер файла больше 5мб"));
    }

    // Валидация: магические байты
   let format = image::guess_format(&data)
    .map_err(|_| Error::from_reason("Можно загружать только арты"))?;

    let img_type = format
        .extensions_str()
        .first()
        .unwrap_or(&"webp")
        .to_string();

    let storage = PathBuf::from(&storage_path);
    let src_for_task = src.clone();

    // Декод + ресайз + энкод — вся тяжёлая работа в блокирующем пуле
    let (medium, small, vertical) = spawn_blocking(
    move || -> napi::Result<(Vec<u8>, Option<Vec<u8>>, bool)> {
        let img = image::load_from_memory(&data)
            .map_err(|e| Error::from_reason(format!("не удалось декодировать изображение: {e}")))?;

        let (w, h) = (img.width(), img.height());

        let medium_img = if src_for_task == "avatars/" {
            img.resize_to_fill(512, 512, image::imageops::FilterType::Lanczos3)
        } else if w > 1920 {
            let new_h = (h as f64 * (1920.0 / w as f64)).round() as u32;
            img.resize_exact(1920, new_h, image::imageops::FilterType::Lanczos3)
        } else {
            img.clone()
        };

        let medium = encode_webp(&medium_img, 80.0)?;

        let small = if src_for_task != "avatars/" {
            Some(encode_webp(
                &img.resize_to_fill(320, 320, image::imageops::FilterType::Lanczos3),
                60.0,
            )?)
        } else {
            None
        };

        Ok((medium, small, h > w))
    },
)
.await
.map_err(|e| Error::from_reason(format!("join error: {e}")))
.and_then(|inner| inner)?;


    let medium_path =
        save_bytes(&storage, &src, &medium).map_err(|e| Error::from_reason(e.to_string()))?;
    let small_path = match &small {
        Some(bytes) => {
            save_bytes(&storage, &src, bytes).map_err(|e| Error::from_reason(e.to_string()))?
        }
        None => String::new(),
    };

    Ok(SaveImageResult {
        high: String::new(),
        medium: medium_path,
        small: small_path,
        vertical,
        r#type: img_type,
    })
}

fn push_file_path(paths: &mut Vec<PathBuf>, storage: &PathBuf, rel: &str) {
    if rel.is_empty() {
        return;
    }
    paths.push(storage.join(format!("{rel}.webp")));
}

fn push_image_paths(paths: &mut Vec<PathBuf>, storage: &PathBuf, image: &SaveImageInput) {
    push_file_path(paths, storage, &image.medium);
    if let Some(small) = &image.small {
        push_file_path(paths, storage, small);
    }
}

#[napi]
pub async fn remove_files(
    input: Either3<String, SaveImageInput, Vec<SaveImageInput>>,
    storage_path: String,
) -> Result<bool> {
    let storage = PathBuf::from(storage_path);

    let mut paths: Vec<PathBuf> = Vec::new();
    match &input {
        Either3::A(rel) => push_file_path(&mut paths, &storage, rel),
        Either3::B(image) => push_image_paths(&mut paths, &storage, image),
        Either3::C(images) => {
            for image in images {
                push_image_paths(&mut paths, &storage, image);
            }
        }
    }

    let mut had_critical_error = false;
    for path in paths {
        match tokio::fs::remove_file(&path).await {
            Ok(()) => {}
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => {
                eprintln!("Ошибка при удалении файла {}: {e}", path.display());
                had_critical_error = true;
            }
        }
    }

    Ok(!had_critical_error)
}

#[napi]
pub async fn load(hash: String, storage_path: String) -> Result<Buffer> {
    if hash.is_empty() {
        return Err(Error::from_reason("пустой hash файла"));
    }

    let filepath = PathBuf::from(&storage_path)
        .join(&hash[..2])
        .join(&hash);

    match tokio::fs::read(&filepath).await {
        Ok(data) => Ok(data.into()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Err(Error::from_reason(format!(
            "File '{}' not found",
            filepath.display()
        ))),
        Err(e) => Err(Error::from_reason(format!(
            "не удалось прочитать файл {}: {e}",
            filepath.display()
        ))),
    }
}
