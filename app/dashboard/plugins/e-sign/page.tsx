import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ESignPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>E Sign</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            E Sign is a tool that allows you to sign your documents
            electronically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
