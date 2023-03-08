const ApiError = require("../error/ApiError");
const uuid = require("uuid");
const path = require("path");
const sharp = require("sharp");
const { unlink, writeFile } = require("fs");
class fileService {
  directory = path.join(__dirname, "../uploads");
  async validate(file, maxSize, mimetype) {
    try {
      const size = file.size;
      let type = file.mimetype.split("/");
      type = type[0];
      let max_size = maxSize * 1024 * 1024;
      if (mimetype !== type) {
        return { error: "Загружать можно лишь арты." };
      }
      if (size > max_size) {
        return { error: `Размер арта не должен превышать ${maxSize}мб.` };
      }
      return true;
    } catch (e) {
      next(e);
    }
  }
  async upload_one(file, user_id, cat, compress, maxWidth, maxHeight) {
    try {
      let fileName = uuid.v4();
      let type = file.mimetype.split("/");
      let dirname = path.join(this.directory, `_${user_id}`, cat);
      //let fullImg = `${fileName}.${type[1]}`;
      let minImg = `min_${fileName}.${type[1]}`;

      //let db_max = `_${user_id}/${cat}/${fileName}.${type[1]}`;
      let db_min = `_${user_id}/${cat}/min_${fileName}.${type[1]}`;

      const minImage = path.join(dirname, minImg);
      //сохранение файла
      const comp = await this.comporess(file, maxWidth, maxHeight, minImage);
      if (comp)
        return {
          //db_max,
          db_min,
          vertical: comp.vertical,
        };
      //if (!compress) return { db_max };
    } catch (e) {
      console.log(e);
    }
  }
  async comporess(file, maxWidth, maxHeight, minImg) {
    try {
      //compress сжатие файла
      const comp = await sharp(file.data).metadata();

      let ratio = Math.min(maxWidth / comp.width, maxHeight / comp.height);
      let newWidth = Math.round(comp.width * ratio);
      let newHeight = Math.round(comp.height * ratio);
      const sh = await sharp(file.data)
        .resize(newWidth, newHeight, { fit: "cover" })
        .toFile(minImg);
      if (comp.height > comp.width) {
        return { vertical: true };
      }
      return { vertical: false };
    } catch (e) {
      console.log(e);
    }
  }
  async removeNoticeImage(images) {
    let pth = path.join(__dirname, "../uploads");
    //max
    images.map((i) => {
      let min = path.join(pth, i.minimize);
      unlink(min, () => {});
      let max = path.join(pth, i.oversize);
      unlink(max, () => {});
    });
    return true;
  }
}

module.exports = new fileService();
