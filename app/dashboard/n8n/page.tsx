import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function N8nPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>n8n automation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            n8n is a low-code automation platform that allows you to create
            workflows to connect different applications and services.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
