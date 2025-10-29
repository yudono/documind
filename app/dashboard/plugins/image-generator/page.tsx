import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TranscriptVideoPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Transcript Video</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Transcript Video is a tool that allows you to transcribe your video
            files into text.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
