
interface OptionButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const OptionButton = ({
  active,
  onClick,
  children,
}: OptionButtonProps) => {
  return (
    <button
      className={`option-button ${
        active ? "selected" : ""
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default OptionButton;