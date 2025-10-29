import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DrivePage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Drive Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Drive Integration is a tool that allows you to connect Google Drive
            with other applications and services.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
