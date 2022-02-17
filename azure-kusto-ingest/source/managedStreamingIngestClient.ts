// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import IngestionProperties from "./ingestionProperties";

import { FileDescriptor, StreamDescriptor } from "./descriptors";
import { AbstractKustoClient } from "./abstractKustoClient";
import { KustoConnectionStringBuilder } from "azure-kusto-data";
import { KustoResponseDataSet } from "azure-kusto-data/source/response";
import { fileToStream, tryStreamToArray } from "./streamUtils";
import StreamingIngestClient from "./streamingIngestClient";
import IngestClient from "./ingestClient";
import { QueueSendMessageResponse } from "@azure/storage-queue";
import streamify from "stream-array";
import { Readable } from "stream";
import { ExponentialRetry } from "./retry";

const maxStreamSize = 1024 * 1024 * 4;
const attemptCount = 3;
const ingestPrefix = "https://ingest-";

class KustoManagedStreamingIngestClient extends AbstractKustoClient {
    private streamingIngestClient: StreamingIngestClient;
    private queuedIngestClient: IngestClient;
    private baseSleepTimeSecs = 1;
    private baseJitterSecs = 1;

    /**
     * Creates a KustoManagedStreamingIngestClient from a DM connection string.
     * This method infers the engine connection string.
     * For advanced usage, use the constructor that takes a DM connection string and an engine connection string.
     *
     * @param dmConnectionString The DM connection string.
     * @param defaultProps The default ingestion properties.
     */
    static fromDmConnectionString(
        dmConnectionString: KustoConnectionStringBuilder,
        defaultProps: IngestionProperties | null = null
    ): KustoManagedStreamingIngestClient {
        if (dmConnectionString.dataSource == null || !dmConnectionString.dataSource.startsWith(ingestPrefix)) {
            throw new Error(`DM connection string must include the prefix '${ingestPrefix}'`);
        }

        const engineConnectionString = KustoConnectionStringBuilder.fromExisting(dmConnectionString);
        engineConnectionString.dataSource = engineConnectionString.dataSource?.replace(ingestPrefix, "https://");

        return new KustoManagedStreamingIngestClient(engineConnectionString, dmConnectionString, defaultProps);
    }

    /**
     * Creates a KustoManagedStreamingIngestClient from a engine connection string.
     * This method infers the engine connection string.
     * For advanced usage, use the constructor that takes an engine connection string and an engine connection string.
     *
     * @param engineConnectionString The engine connection string.
     * @param defaultProps The default ingestion properties.
     */
    static fromEngineConnectionString(
        engineConnectionString: KustoConnectionStringBuilder,
        defaultProps: IngestionProperties | null = null
    ): KustoManagedStreamingIngestClient {
        if (engineConnectionString.dataSource == null || engineConnectionString.dataSource.startsWith(ingestPrefix)) {
            throw new Error(`Engine connection string must not include the prefix '${ingestPrefix}'`);
        }

        const dmConnectionString = KustoConnectionStringBuilder.fromExisting(engineConnectionString);
        dmConnectionString.dataSource = dmConnectionString.dataSource?.replace("https://", ingestPrefix);

        return new KustoManagedStreamingIngestClient(engineConnectionString, dmConnectionString, defaultProps);
    }

    constructor(
        engineKcsb: string | KustoConnectionStringBuilder,
        dmKcsb: string | KustoConnectionStringBuilder,
        defaultProps: IngestionProperties | null = null
    ) {
        super(defaultProps);
        this.streamingIngestClient = new StreamingIngestClient(engineKcsb, defaultProps);
        this.queuedIngestClient = new IngestClient(dmKcsb, defaultProps);
    }

    async ingestFromStream(
        stream: StreamDescriptor | Readable,
        ingestionProperties: IngestionProperties
    ): Promise<any> {
        const props = this._mergeProps(ingestionProperties);
        props.validate();
        const descriptor = stream instanceof StreamDescriptor ? stream : new StreamDescriptor(stream);

        let result = await tryStreamToArray(descriptor.stream, maxStreamSize);

        if (result instanceof Buffer) {
            // If we get buffer that means it was less than the max size, so we can do streamingIngestion
            const retry = new ExponentialRetry(attemptCount, this.baseSleepTimeSecs, this.baseJitterSecs);
            while (retry.shouldTry()) {
                try {
                    const sourceId = `KNC.executeManagedStreamingIngest;${descriptor.sourceId};${retry.currentAttempt}`;
                    return await this.streamingIngestClient.ingestFromStream(
                        new StreamDescriptor(streamify([result])).merge(descriptor),
                        ingestionProperties,
                        sourceId
                    );
                } catch (err: unknown) {
                    const oneApiError = err as { "@permanent"?: boolean };
                    if (oneApiError["@permanent"]) {
                        throw err;
                    }
                    await retry.backoff();
                }
            }

            result = streamify([result]);
        }

        return await this.queuedIngestClient.ingestFromStream(
            new StreamDescriptor(result).merge(descriptor),
            ingestionProperties
        );
    }

    async ingestFromFile(
        file: FileDescriptor | string,
        ingestionProperties: IngestionProperties
    ): Promise<KustoResponseDataSet | QueueSendMessageResponse> {
        const props = this._mergeProps(ingestionProperties);
        props.validate();
        return await this.ingestFromStream(fileToStream(file), ingestionProperties);
    }
}

export default KustoManagedStreamingIngestClient;
