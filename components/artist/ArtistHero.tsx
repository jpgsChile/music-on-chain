export default function ArtistHero({ dict }: { dict: any }) {
  const links = Array.isArray(dict.hero.links) ? dict.hero.links : [];

  return (
    <section className="relative">
      <div
        className="h-48 bg-cover bg-center"
        style={{ backgroundImage: "url(/cleaver-banner.jpg)" }}
      />

      <div className="px-4 -mt-12 flex items-end gap-4">
        <img
          src="/cleaver-avatar.jpg"
          alt={dict.hero.name}
          className="w-24 h-24 rounded-full border-4 border-black object-cover"
        />

        <div>
          <h1 className="text-2xl font-bold">{dict.hero.name}</h1>
          <p className="text-sm opacity-70">{dict.hero.countryGenre}</p>
          <div className="flex gap-3 mt-1 text-sm">
            {links.map((link) => (
              <a key={link.label} href={link.href} className="underline">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <p className="px-4 mt-4 text-sm opacity-80">{dict.hero.bio}</p>
    </section>
  );
}
