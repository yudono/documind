import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ImageGeneratorPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Image Generator</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Image Generator is a tool that allows you to generate images from
            text.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
