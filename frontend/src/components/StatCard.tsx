
interface StatCardProps {
  label: string;
  value: string;
  description: string;
}

const StatCard = ({
  label,
  value,
  description,
}: StatCardProps) => {
  return (
    <div className="stat-card">

      <p>{label}</p>

      <strong>{value}</strong>

      <span>{description}</span>

    </div>
  );
};

export default StatCard;