/**
 * Sprint 42A — Vitest setup file.
 *
 * - Matchers de jest-dom (toBeInTheDocument, toHaveAttribute, etc.)
 * - Auto-cleanup del DOM entre tests (vitest no lo hace por default
 *   con @testing-library/react; sin esto los renders se acumulan en
 *   el mismo `<body>` y `getByText` choca con "Multiple elements found").
 */
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
