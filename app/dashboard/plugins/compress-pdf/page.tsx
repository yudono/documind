import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompressPdfPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Compress PDF</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Compress PDF is a tool that allows you to compress your PDF
            documents to reduce their file size.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
