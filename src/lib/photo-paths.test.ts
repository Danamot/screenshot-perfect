import { describe, expect, it } from "vitest";
import { bucketPathOf, isBucketImage, PHOTO_BUCKET } from "./photo-paths";

describe("bucketPathOf", () => {
  it("reads the object path out of a stored bucket route", () => {
    expect(bucketPathOf("producto-fotos/mq9x-lampara.jpg")).toBe("mq9x-lampara.jpg");
  });

  it("reads the object path out of a public storage address", () => {
    expect(bucketPathOf("https://host.example/storage/v1/object/public/producto-fotos/mq9x-lampara.jpg")).toBe(
      "mq9x-lampara.jpg",
    );
  });

  it("reads the object path out of an already signed address", () => {
    expect(
      bucketPathOf("https://host.example/storage/v1/object/sign/producto-fotos/mq9x-lampara.jpg?token=abc123"),
    ).toBe("mq9x-lampara.jpg");
  });

  it("leaves app photos alone", () => {
    expect(bucketPathOf("/products/lampara-luna.jpg")).toBeNull();
  });

  it("leaves external addresses alone", () => {
    expect(bucketPathOf("https://cdn.example.com/a.jpg")).toBeNull();
  });

  it("treats empty and missing values as no photo", () => {
    expect(bucketPathOf("")).toBeNull();
    expect(bucketPathOf("   ")).toBeNull();
    expect(bucketPathOf(null)).toBeNull();
    expect(bucketPathOf(undefined)).toBeNull();
  });

  it("does not confuse another bucket with ours", () => {
    expect(bucketPathOf("https://host/storage/v1/object/public/otros/mq9x.jpg")).toBeNull();
  });
});

describe("isBucketImage", () => {
  it("flags only photos that live in the product photo bucket", () => {
    expect(isBucketImage(`${PHOTO_BUCKET}/mq9x-lampara.jpg`)).toBe(true);
    expect(isBucketImage("/products/lampara-luna.jpg")).toBe(false);
    expect(isBucketImage(null)).toBe(false);
  });
});
