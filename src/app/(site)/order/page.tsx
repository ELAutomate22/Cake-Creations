import type { Metadata } from "next";
import { business } from "@/content/site";
import { orderCopy } from "@/content/order";
import { OrderForm } from "@/components/order/OrderForm";

export const metadata: Metadata = {
  title: "Request a Cake",
  description:
    "Tell Elshadai Cake Creations about the cake you have in mind. Sending a request does not confirm an order — a quote follows once availability is confirmed.",
  alternates: { canonical: "/order" },
  openGraph: {
    title: `Request a Cake — ${business.name}`,
    description: orderCopy.standfirst,
    url: "/order",
  },
};

/**
 * The cake request.
 *
 * A route of its own rather than a dialog. The form runs to seven steps and
 * carries photographs; a customer part-way through it needs to be able to
 * reload, come back, or open a policy without losing what they have typed.
 */
export default function OrderPage() {
  return (
    <>
      <header className="bg-ivory pt-40 pb-10 sm:pt-44">
        <div className="shell">
          <p className="eyebrow text-cocoa-soft">{orderCopy.eyebrow}</p>
          <h1 className="display-lg mt-5 text-espresso">{orderCopy.heading}</h1>
          <p className="voice measure-wide mt-6 text-cocoa">
            {orderCopy.standfirst}
          </p>
        </div>
      </header>

      <OrderForm />
    </>
  );
}
