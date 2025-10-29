import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FormsPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Form Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Form Integration is a tool that allows you to connect Google Forms
            with other applications and services.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
