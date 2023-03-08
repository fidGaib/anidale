import cl from "./styles/description.module.css";

const Description = ({ description }) => {
  return <div className={cl.description}>{description}</div>;
};

export default Description;
