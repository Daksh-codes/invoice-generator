import { useEffect, useRef, useState } from "react";
import { imageUrl, uploadLineItemImage } from "../api";

export default function LineItemImageInput({ imagePath, onChange, disabled }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(imagePath ? imageUrl(imagePath) : null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPreview(imagePath ? imageUrl(imagePath) : null);
  }, [imagePath]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("line_item_image", file);
      const res = await uploadLineItemImage(formData);
      onChange(res.data.imagePath ?? null);
      setPreview(imageUrl(res.data.imagePath));
    } catch (err) {
      setPreview(imagePath ? imageUrl(imagePath) : null);
      setError(err.response?.data?.message || "Image upload failed");
    } finally {
      URL.revokeObjectURL(localPreview);
      setUploading(false);
      e.target.value = "";
    }
  }

  function chooseFile() {
    if (!disabled && !uploading) inputRef.current?.click();
  }

  function removeImage() {
    setError("");
    onChange(null);
    setPreview(null);
  }

  return (
    <div className="mt-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />

      {preview ? (
        <div className="flex items-center gap-2">
          <img
            src={preview}
            alt=""
            className="w-10 h-10 rounded border border-slate-200 object-contain bg-white"
          />
          <button
            type="button"
            onClick={chooseFile}
            disabled={disabled || uploading}
            className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Change image"}
          </button>
          <button
            type="button"
            onClick={removeImage}
            disabled={disabled || uploading}
            className="text-xs text-red-400 hover:text-red-500 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={chooseFile}
          disabled={disabled || uploading}
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 disabled:opacity-50"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add image (optional)
        </button>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
