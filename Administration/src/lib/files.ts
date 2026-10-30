// Fichier → « data URL » (texte autonome) pour l'afficher dans <img>.
// Contrairement à URL.createObjectURL, il n'y a rien à libérer : l'image reste valable
// quels que soient les démontages/remontages (mode strict de React, rechargements, cache).
export function toDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
