// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import assert from "assert";
import { KustoIngestClient } from "../source/ingestClient";
import { DataFormat, IngestionProperties, ReportLevel, ReportMethod } from "../source/ingestionProperties";
import { IngestionPropertiesValidationError } from "../source/errors";

describe("KustoIngestClient", () => {
    describe("#constructor()", () => {
        it("valid input", () => {
            const ingestClient = new KustoIngestClient("https://cluster.kusto.windows.net", {
                database: "db",
                table: "table",
                format: "json",
            } as IngestionProperties);

            assert.notStrictEqual(ingestClient.defaultProps, null);
            assert.strictEqual(ingestClient.resourceManager.kustoClient.cluster, "https://cluster.kusto.windows.net");
            assert.strictEqual(ingestClient.defaultProps!.database, "db");
            assert.strictEqual(ingestClient.defaultProps!.table, "table");
            assert.strictEqual(ingestClient.defaultProps!.format, "json");
        });
    });

    describe("#_resolveProperties()", () => {
        it("empty default props", () => {
            const newProps = new IngestionProperties({
                database: "db",
                table: "table",
                format: DataFormat.JSON,
            });
            const client = new KustoIngestClient("https://cluster.region.kusto.windows.net");
            const actual = client._getMergedProps(newProps);

            assert.strictEqual(actual.database, "db");
            assert.strictEqual(actual.table, "table");
            assert.strictEqual(actual.format, "json");
        });

        it("new props object", () => {
            const newProps = {
                database: "db",
                table: "table",
                format: DataFormat.JSON,
            };
            const client = new KustoIngestClient("https://cluster.region.kusto.windows.net");
            const actual = client._getMergedProps(newProps);

            assert.strictEqual(actual.database, "db");
            assert.strictEqual(actual.table, "table");
            assert.strictEqual(actual.format, "json");
        });

        it("empty new props", () => {
            const defaultProps = new IngestionProperties({
                database: "db",
                table: "table",
                format: DataFormat.JSON,
            });
            // TODO: not sure a unit test will be useful here
            const client = new KustoIngestClient("https://cluster.region.kusto.windows.net", defaultProps);
            const actual = client._getMergedProps(null);

            assert.strictEqual(actual.database, "db");
            assert.strictEqual(actual.table, "table");
            assert.strictEqual(actual.format, "json");
        });

        it("default props object", () => {
            const defaultProps = {
                database: "db",
                table: "table",
                format: DataFormat.JSON,
            };
            const client = new KustoIngestClient("https://cluster.region.kusto.windows.net", defaultProps);
            const actual = client._getMergedProps(null);

            assert.strictEqual(actual.database, "db");
            assert.strictEqual(actual.table, "table");
            assert.strictEqual(actual.format, "json");
        });

        it("both exists props", () => {
            const defaultProps = new IngestionProperties({
                database: "db",
                table: "table",
                format: DataFormat.JSON,
                reportLevel: ReportLevel.DoNotReport,
            });
            const newProps = new IngestionProperties({});
            newProps.database = "db2";
            newProps.ingestionMappingReference = "MappingRef";
            newProps.format = DataFormat.AVRO;

            const client = new KustoIngestClient("https://cluster.region.kusto.windows.net", defaultProps);
            const actual = client._getMergedProps(newProps);

            assert.strictEqual(actual.database, "db2");
            assert.strictEqual(actual.table, "table");
            assert.strictEqual(actual.format, "avro");
            assert.strictEqual(actual.ingestionMappingReference, "MappingRef");
            assert.strictEqual(actual.reportLevel, ReportLevel.DoNotReport);
            assert.strictEqual(actual.reportMethod, ReportMethod.Queue);
        });

        it("both exists objects", () => {
            const defaultProps = {
                database: "db",
                table: "table",
                format: DataFormat.JSON,
            };
            const newProps = {
                database: "db2",
                ingestionMappingReference: "MappingRef",
                format: DataFormat.AVRO,
                reportMethod: ReportMethod.Table,
            };

            const client = new KustoIngestClient("https://cluster.region.kusto.windows.net", defaultProps);
            const actual = client._getMergedProps(newProps);

            assert.strictEqual(actual.database, "db2");
            assert.strictEqual(actual.table, "table");
            assert.strictEqual(actual.format, "avro");
            assert.strictEqual(actual.ingestionMappingReference, "MappingRef");
            assert.strictEqual(actual.reportLevel, ReportLevel.FailuresOnly);
            assert.strictEqual(actual.reportMethod, ReportMethod.Table);
        });

        it("test defaults", () => {
            const defaultProps = {
                database: "db",
                table: "table",
            };
            const newProps = {
                database: "db2",
                ingestionMappingReference: "MappingRef",
            };

            const client = new KustoIngestClient("https://cluster.region.kusto.windows.net", defaultProps);
            const actual = client._getMergedProps(newProps);

            assert.strictEqual(actual.database, "db2");
            assert.strictEqual(actual.table, "table");
            assert.strictEqual(actual.ingestionMappingReference, "MappingRef");
            assert.strictEqual(actual.format, "csv");
            assert.strictEqual(actual.reportLevel, ReportLevel.FailuresOnly);
            assert.strictEqual(actual.reportMethod, ReportMethod.Queue);
        });

        it("empty both", () => {
            const client = new KustoIngestClient("https://cluster.region.kusto.windows.net");

            assert.throws(() => client._getMergedProps(), new IngestionPropertiesValidationError("Must define a target database"));
        });
    });

    describe("#ingestFromFile()", () => {
        it("valid input", () => {
            // TODO: not sure a unit test will be useful here
        });
    });

    describe("#ingestFromStream()", () => {
        it("valid input", () => {
            // TODO: not sure a unit test will be useful here
        });
    });

    describe("#ingestFromBlob()", () => {
        it("valid input", () => {
            // TODO: not sure a unit test will be useful here
        });
    });
});
