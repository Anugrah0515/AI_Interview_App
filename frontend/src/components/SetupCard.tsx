interface SetupCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

const SetupCard = ({
  icon,
  title,
  description,
  children,
}: SetupCardProps) => {
  return (
    <div className="setup-card">

      <div className="card-heading">
        <div className="card-icon">
          {icon}
        </div>

        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      {children}

    </div>
  );
};

export default SetupCard;