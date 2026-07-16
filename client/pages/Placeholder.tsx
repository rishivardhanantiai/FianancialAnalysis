import Layout from "@/components/Layout";

interface PlaceholderProps {
  title: string;
  subtitle?: string;
}

export default function Placeholder({ title, subtitle }: PlaceholderProps) {
  return (
    <Layout title={title} subtitle={subtitle}>
      <div className="bg-white border border-blue-pale rounded-lg p-12 text-center">
        <div className="text-4xl mb-4">🚀</div>
        <h2 className="text-xl font-bold text-navy mb-2">
          {title} - Coming Soon
        </h2>
        <p className="text-blue-mid mb-6">
          This section is currently under development. Continue exploring other
          sections or come back later for updates.
        </p>
        <p className="text-xs text-blue-mid">
          You can prompt the assistant to help build out this page if you'd like
          to add more features.
        </p>
      </div>
    </Layout>
  );
}
