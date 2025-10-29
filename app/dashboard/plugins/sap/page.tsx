import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SapPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Remove AI</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Remove AI is a tool that allows you to remove AI from your
            documents.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
