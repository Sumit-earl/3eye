import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Find the revenue your storefront is leaking</h1>
        <p className={styles.text}>
          3eye ranks which customer environment segments — device, connection, country — are
          correlated with your lost checkouts, in estimated dollars. Consent-first,
          aggregate-only, and private by design.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Ranked revenue leaks.</strong> See which slow, mobile, or remote segments are
            quietly costing you checkout conversions — with every figure labelled estimated and
            its method shown.
          </li>
          <li>
            <strong>Zero PII, zero cookies.</strong> Coarse buckets only, k-anonymity suppression,
            and raw data that prunes itself after your retention window. Nothing to leak.
          </li>
          <li>
            <strong>Minutes to install.</strong> Enable the 3eye Capture app embed in your theme —
            no code, no backend URL, no theme edits. Start seeing leaks the same day.
          </li>
        </ul>
      </div>
    </div>
  );
}
