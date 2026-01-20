/**
 * Common Module
 *
 * This module exports shared utilities and services that can be used
 * across the entire application.
 *
 * Usage:
 *   import { StorageFactory, IStorageProvider } from '../common';
 *
 * Or import specific modules:
 *   import { CloudinaryProvider } from '../common/storage';
 */

// Storage Module - File upload abstraction layer
export * from "./storage";
