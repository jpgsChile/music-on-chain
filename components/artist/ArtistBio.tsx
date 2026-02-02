type ArtistBioProps = {
  bio: string;
  moreLabel?: string;
};

export default function ArtistBio({ bio, moreLabel }: ArtistBioProps) {
  return (
    <div className="px-4 mt-4 text-sm opacity-80">
      <p>{bio}</p>
      {moreLabel ? (
        <button className="mt-2 text-xs underline">{moreLabel}</button>
      ) : null}
    </div>
  );
}
