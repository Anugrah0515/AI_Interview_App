const SummaryItem = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => {
  return (
    <div className="summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
};

export default SummaryItem;