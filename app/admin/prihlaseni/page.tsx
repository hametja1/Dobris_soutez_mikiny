import { isAdminConfigured } from "@/lib/auth";
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
          6 znaků) a aplikaci znovu nasaďte.
        </div>
      ) : (
        <form action={loginAction} className="form card" style={{ maxWidth: 420 }}>
          <div className="field">
            <label htmlFor="password">Heslo správce</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" autoFocus />
          </div>
          {chyba && <div className="error" role="alert">Nesprávné heslo.</div>}
          <button className="btn" type="submit">Přihlásit</button>
        </form>
      )}
    </>
  );
}
