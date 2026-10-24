export default function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="text-xs text-red-700 bg-red-50 rounded-lg px-2.5 py-1.5 mt-2">{error}</p>;
}
