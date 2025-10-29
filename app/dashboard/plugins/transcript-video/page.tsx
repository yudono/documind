import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResizeImagePage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Resize Image</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Resize Image is a tool that allows you to resize your images to
            different dimensions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
