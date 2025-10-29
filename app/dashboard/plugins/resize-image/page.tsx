import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CropImagePage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Crop Image</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Crop Image is a tool that allows you to crop your images to remove
            unnecessary parts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
