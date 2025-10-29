import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SplitPdfPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Split PDF</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Split PDF is a tool that allows you to split your PDF documents into
            multiple pages.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
