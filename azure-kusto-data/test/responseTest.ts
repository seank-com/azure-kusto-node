// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import assert from "assert";

import v2Response from "./data/response/v2.json";
import { KustoResponseDataSetV2, V2Frames } from "../source/response";

describe("KustoResultDataSet", () => {
    describe("#constructor()", () => {
        it("valid input", () => {
            const actual = new KustoResponseDataSetV2(v2Response as V2Frames);

            assert.strictEqual(actual.primaryResults.length, 1);
            assert.strictEqual(actual.tables.length, 3);
            assert.notStrictEqual(actual.statusTable, null);
        });
    });
});
