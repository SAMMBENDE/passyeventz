import { describe, expect, it } from "vitest";

import {
  paypalCaptureDetails,
  paypalWebhookCaptureDetails,
} from "@/lib/deposit-payments";

describe("PayPal capture parsing", () => {
  it("validates the captured amount and uses the order ID from the trusted return request", () => {
    const captureResponse = {
      purchase_units: [
        {
          payments: {
            captures: [
              {
                id: "capture-1",
                status: "COMPLETED",
                amount: { value: "75.50", currency_code: "EUR" },
              },
            ],
          },
        },
      ],
    };

    expect(paypalCaptureDetails(captureResponse, "order-1")).toEqual({
      id: "capture-1",
      orderId: "order-1",
      amountCents: 7550,
      currency: "eur",
    });
  });

  it("rejects a capture associated with a different order or a non-completed status", () => {
    const captureResponse = {
      purchase_units: [
        {
          payments: {
            captures: [
              {
                id: "capture-1",
                status: "COMPLETED",
                amount: { value: "75.50", currency_code: "EUR" },
                supplementary_data: { related_ids: { order_id: "other-order" } },
              },
            ],
          },
        },
      ],
    };

    expect(paypalCaptureDetails(captureResponse, "order-1")).toBeNull();
    expect(
      paypalCaptureDetails(
        {
          ...captureResponse,
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    ...captureResponse.purchase_units[0].payments.captures[0],
                    status: "PENDING",
                    supplementary_data: undefined,
                  },
                ],
              },
            },
          ],
        },
        "order-1",
      ),
    ).toBeNull();
  });

  it("accepts only a completed PayPal capture webhook with an order reference", () => {
    const event = {
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: "capture-1",
        status: "COMPLETED",
        amount: { value: "20.00", currency_code: "EUR" },
        supplementary_data: { related_ids: { order_id: "order-1" } },
      },
    };

    expect(paypalWebhookCaptureDetails(event)).toEqual({
      id: "capture-1",
      orderId: "order-1",
      amountCents: 2000,
      currency: "eur",
    });
    expect(
      paypalWebhookCaptureDetails({
        ...event,
        resource: { ...event.resource, status: "PENDING" },
      }),
    ).toBeNull();
  });
});
