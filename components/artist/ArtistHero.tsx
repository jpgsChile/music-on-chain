type ArtistHeroProps = {
  bannerUrl: string;
  avatarUrl: string;
  name: string;
  countryGenre: string;
  links: { label: string; href: string }[];
};

export default function ArtistHero({
  bannerUrl,
  avatarUrl,
  name,
  countryGenre,
  links,
}: ArtistHeroProps) {
  return (
    <section className="relative">
      <div
        className="h-48 bg-cover bg-center"
        style={{ backgroundImage: `url(${bannerUrl})` }}
      />

      <div className="px-4 -mt-12 flex items-end gap-4">
        <img
          src={avatarUrl}
          alt={name}
          className="w-24 h-24 rounded-full border-4 border-black object-cover"
        />

        <div>
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="text-sm opacity-70">{countryGenre}</p>
          <div className="flex gap-3 mt-1 text-sm">
            {links.map((link) => (
              <a key={link.label} href={link.href} className="underline">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
