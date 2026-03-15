// src/pages/InvoicePreviewPage.jsx
import { useParams } from "react-router-dom";
import InvoicePreview from "./InvoicePreview";

export default function InvoicePreviewPage() {
  const { id } = useParams();
  return <InvoicePreview id={id} />;
}