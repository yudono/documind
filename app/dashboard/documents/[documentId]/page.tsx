"use client";

import { useParams } from "next/navigation";
import DocumentEditor from "@/components/document-editor";

export default function EditDocumentPage() {
  const params = useParams();
  const documentId = params.documentId as string;

  return <DocumentEditor mode="edit" documentId={documentId} />;
}
