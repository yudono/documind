import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompressImagePage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Compress Image</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Compress Image is a tool that allows you to compress your images to
            reduce their file size.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
