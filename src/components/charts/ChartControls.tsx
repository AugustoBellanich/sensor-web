interface ChartControlsProps {
  isZoomed: boolean;
  onResetZoom: () => void;
}

export default function ChartControls({
  isZoomed,
  onResetZoom,
}: ChartControlsProps) {
  if (!isZoomed) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onResetZoom}
      className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
    >
      Restaurar Zoom
    </button>
  );
}