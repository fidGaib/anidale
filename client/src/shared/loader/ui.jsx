import cl from "./style.module.css";

const Loader = () => {
  return (
    <div className={cl.loader}>
      <img src="http://localhost:5000/api/uploads/site-images/loading.gif" />
    </div>
  );
};

export default Loader;
