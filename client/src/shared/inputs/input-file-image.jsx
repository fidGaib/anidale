const InputFileImage = (props) => {
  return (
    <input
      type="file"
      hidden
      multiple
      accept="image/*"
      formEncType="multipart/form-data"
      {...props}
    />
  );
};

export default InputFileImage;
