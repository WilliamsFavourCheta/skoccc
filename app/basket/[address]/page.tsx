import { BasketDetail } from "./basket-detail";

export default async function BasketPage({
  params,
}: PageProps<"/basket/[address]">) {
  const { address } = await params;

  return <BasketDetail address={address} />;
}
