export default function Background() {
  return (
    <div className="min-h-screen fixed inset-0 -z-10 w-screen overflow-hidden bg-black">
      <div className="w-[400px] aspect-square bg-secondary/20 absolute top-[-120px] left-[-120px] rounded-full blur-[120px]"></div>
        <div className="h-full w-full bg-gradient-to-b from-black to-primary/10" />
    </div>
    
  );
}