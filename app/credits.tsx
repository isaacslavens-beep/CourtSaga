// The match data's credit, as its licence asks: where it's from, who made it, the licence, and that
// it's been adapted. CC BY-NC-SA is non-commercial, which CourtSaga is: free, no ads.

const link = "underline decoration-line underline-offset-2 hover:text-court";

export function DataCredit() {
  return (
    <span>
      <span className="font-semibold">Match data:</span>{" "}
      <a href="https://github.com/Tennismylife/TML-Database" className={link} target="_blank" rel="noopener noreferrer">
        TML-Database
      </a>{" "}
      /{" "}
      <a href="https://github.com/JeffSackmann" className={link} target="_blank" rel="noopener noreferrer">
        Jeff Sackmann
      </a>
      , adapted,{" "}
      <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" className={link} target="_blank" rel="noopener noreferrer">
        CC BY-NC-SA 4.0
      </a>
    </span>
  );
}
