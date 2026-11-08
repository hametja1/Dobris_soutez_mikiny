import { ADMIN_PASSWORD_MIN_LENGTH, isAdminConfigured } from "@/lib/auth";
import { loginAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ chyba?: string }> }) {
  const { chyba } = await searchParams;

  return (
    <>
      <h1>Správa soutěže</h1>
      {!isAdminConfigured() ? (
        <div className="notice">
          Správa zatím není nastavená. Na Vercelu přidejte proměnnou prostředí <code>ADMIN_PASSWORD</code> (alespoň
          {ADMIN_PASSWORD_MIN_LENGTH} znaků) a aplikaci znovu nasaďte.
        </div>
      ) : (
        <form action={loginAction} className="form card" style={{ maxWidth: 420 }}>
          <div className="field">
            <label htmlFor="password">Heslo správce</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" autoFocus />
          </div>
          {chyba === "1" && <div className="error" role="alert">Nesprávné heslo.</div>}
          {chyba === "2" && (
            <div className="error" role="alert">Příliš mnoho neúspěšných pokusů. Zkuste to prosím znovu za 15 minut.</div>
          )}
          <button className="btn" type="submit">Přihlásit</button>
        </form>
      )}
    </>
  );
}
