export function handleBusinessLogoLoad(event) {
  const image = event?.currentTarget;
  if (!image) return;

  const width = Number(image.naturalWidth || 0);
  const height = Number(image.naturalHeight || 0);
  const isTallBusinessLogo = width > 0 && height / width > 1.15;

  image.classList.toggle('is-tall-business-logo', isTallBusinessLogo);
}
