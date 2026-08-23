export default function Background() {
  return (
    <div className="min-h-screen fixed inset-0 -z-10 w-screen overflow-hidden bg-background">
      {/* Faint blue wash behind the top of the page */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] aspect-square rounded-full bg-primary/[0.07] blur-[160px]" />
      {/* Corner glow, bottom-right */}
      <div className="absolute bottom-[-260px] right-[-200px] w-[700px] aspect-square rounded-full bg-secondary/[0.08] blur-[160px]" />
    </div>
  );
}
