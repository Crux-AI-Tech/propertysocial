import { Client } from '@elastic/elasticsearch';
import { logger } from './utils/logger';

// Elasticsearch client singleton
class ElasticsearchClient {
  private static instance: ElasticsearchClient;
  private client: Client;
  private isConnected = false;

  private constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: process.env.ELASTICSEARCH_AUTH_ENABLED === 'true' ? {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || 'changeme',
      } : undefined,
      tls: process.env.ELASTICSEARCH_TLS_ENABLED === 'true' ? {
        rejectUnauthorized: process.env.ELASTICSEARCH_VERIFY_CERTIFICATE === 'true',
      } : undefined,
    });
  }

  public static getInstance(): ElasticsearchClient {
    if (!ElasticsearchClient.instance) {
      ElasticsearchClient.instance = new ElasticsearchClient();
    }
    return ElasticsearchClient.instance;
  }

  public getClient(): Client {
    return this.client;
  }

  public async connect(): Promise<void> {
    try {
      const info = await this.client.info();
      logger.info(`Connected to Elasticsearch cluster: ${info.cluster_name}`);
      this.isConnected = true;
    } catch (error) {
      logger.error('Failed to connect to Elasticsearch:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const health = await this.client.cluster.health();
      const isHealthy = ['green', 'yellow'].includes(health.status);
      
      if (!isHealthy) {
        logger.warn(`Elasticsearch cluster health is ${health.status}`);
      }
      
      return isHealthy;
    } catch (error) {
      logger.error('Elasticsearch health check failed:', error);
      return false;
    }
  }

  public async createIndex(indexName: string, mappings: any): Promise<void> {
    try {
      const indexExists = await this.client.indices.exists({ index: indexName });
      
      if (!indexExists) {
        await this.client.indices.create({
          index: indexName,
          body: {
            mappings,
            settings: {
              number_of_shards: 1,
              number_of_replicas: 1,
              analysis: {
                analyzer: {
                  custom_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'asciifolding'],
                  },
                },
              },
            },
          },
        });
        logger.info(`Created Elasticsearch index: ${indexName}`);
      }
    } catch (error) {
      logger.error(`Failed to create Elasticsearch index ${indexName}:`, error);
      throw error;
    }
  }

  public async deleteIndex(indexName: string): Promise<void> {
    try {
      const indexExists = await this.client.indices.exists({ index: indexName });
      
      if (indexExists) {
        await this.client.indices.delete({ index: indexName });
        logger.info(`Deleted Elasticsearch index: ${indexName}`);
      }
    } catch (error) {
      logger.error(`Failed to delete Elasticsearch index ${indexName}:`, error);
      throw error;
    }
  }

  public async indexDocument(indexName: string, id: string, document: any): Promise<void> {
    try {
      await this.client.index({
        index: indexName,
        id,
        document,
        refresh: true,
      });
    } catch (error) {
      logger.error(`Failed to index document ${id} in ${indexName}:`, error);
      throw error;
    }
  }

  public async bulkIndex(indexName: string, documents: Array<{ id: string; document: any }>): Promise<void> {
    try {
      const operations = documents.flatMap(doc => [
        { index: { _index: indexName, _id: doc.id } },
        doc.document,
      ]);

      await this.client.bulk({
        refresh: true,
        operations,
      });
    } catch (error) {
      logger.error(`Failed to bulk index documents in ${indexName}:`, error);
      throw error;
    }
  }

  public async updateDocument(indexName: string, id: string, document: any): Promise<void> {
    try {
      await this.client.update({
        index: indexName,
        id,
        doc: document,
        refresh: true,
      });
    } catch (error) {
      logger.error(`Failed to update document ${id} in ${indexName}:`, error);
      throw error;
    }
  }

  public async deleteDocument(indexName: string, id: string): Promise<void> {
    try {
      await this.client.delete({
        index: indexName,
        id,
        refresh: true,
      });
    } catch (error) {
      logger.error(`Failed to delete document ${id} from ${indexName}:`, error);
      throw error;
    }
  }

  public async search(indexName: string, query: any): Promise<any> {
    try {
      const response = await this.client.search({
        index: indexName,
        ...query,
      });
      
      return response;
    } catch (error) {
      logger.error(`Search failed in ${indexName}:`, error);
      throw error;
    }
  }

  public async count(indexName: string, query: any): Promise<number> {
    try {
      const response = await this.client.count({
        index: indexName,
        ...query,
      });
      
      return response.count;
    } catch (error) {
      logger.error(`Count failed in ${indexName}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const elasticsearchClient = ElasticsearchClient.getInstance();
export default elasticsearchClient;