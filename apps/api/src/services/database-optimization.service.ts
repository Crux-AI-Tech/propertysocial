import { PrismaClient } from '@prisma/client';
import { redis } from '@eu-real-estate/database';
import { logger } from '../utils/logger';
import { CacheService } from './cache.service';

export interface QueryOptimizationResult {
  originalQuery: string;
  optimizedQuery: string;
  estimatedImprovement: number;
  recommendations: string[];
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'btree' | 'gin' | 'gist' | 'hash';
  reason: string;
  estimatedImpact: 'high' | 'medium' | 'low';
}

export interface DatabaseStats {
  totalQueries: number;
  slowQueries: number;
  averageQueryTime: number;
  cacheHitRate: number;
  connectionPoolUsage: number;
  indexUsage: Record<string, number>;
  tableStats: Array<{
    table: string;
    rowCount: number;
    size: string;
    indexCount: number;
  }>;
}

export class DatabaseOptimizationService {
  private static prisma = new PrismaClient();
  private static queryStats = new Map<string, { count: number; totalTime: number; lastExecuted: Date }>();
  private static slowQueryThreshold = 1000; // 1 second

  /**
   * Analyze and optimize database queries
   */
  static async analyzeQueries(): Promise<QueryOptimizationResult[]> {
    const results: QueryOptimizationResult[] = [];
    
    try {
      // Get slow queries from PostgreSQL
      const slowQueries = await this.getSlowQueries();
      
      for (const query of slowQueries) {
        const optimization = await this.optimizeQuery(query);
        if (optimization) {
          results.push(optimization);
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Query analysis error:', error);
      return [];
    }
  }

  /**
   * Generate index recommendations
   */
  static async generateIndexRecommendations(): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];
    
    try {
      // Analyze query patterns to recommend indexes
      const queryPatterns = await this.analyzeQueryPatterns();
      
      // Check for missing indexes on foreign keys
      const foreignKeyIndexes = await this.checkForeignKeyIndexes();
      recommendations.push(...foreignKeyIndexes);
      
      // Check for composite index opportunities
      const compositeIndexes = await this.findCompositeIndexOpportunities();
      recommendations.push(...compositeIndexes);
      
      // Check for unused indexes
      const unusedIndexes = await this.findUnusedIndexes();
      recommendations.push(...unusedIndexes.map(index => ({
        table: index.table,
        columns: [index.column],
        type: 'btree' as const,
        reason: `Index '${index.name}' is unused and should be dropped`,
        estimatedImpact: 'medium' as const,
      })));
      
      return recommendations;
    } catch (error) {
      logger.error('Index recommendation error:', error);
      return [];
    }
  }

  /**
   * Get comprehensive database statistics
   */
  static async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      const [
        queryStats,
        cacheStats,
        connectionStats,
        tableStats,
        indexStats
      ] = await Promise.all([
        this.getQueryStatistics(),
        CacheService.getStats(),
        this.getConnectionStatistics(),
        this.getTableStatistics(),
        this.getIndexStatistics(),
      ]);

      return {
        totalQueries: queryStats.total,
        slowQueries: queryStats.slow,
        averageQueryTime: queryStats.averageTime,
        cacheHitRate: cacheStats.hitRate,
        connectionPoolUsage: connectionStats.usage,
        indexUsage: indexStats,
        tableStats,
      };
    } catch (error) {
      logger.error('Database stats error:', error);
      return {
        totalQueries: 0,
        slowQueries: 0,
        averageQueryTime: 0,
        cacheHitRate: 0,
        connectionPoolUsage: 0,
        indexUsage: {},
        tableStats: [],
      };
    }
  }

  /**
   * Optimize database configuration
   */
  static async optimizeConfiguration(): Promise<{
    recommendations: string[];
    applied: string[];
    errors: string[];
  }> {
    const recommendations: string[] = [];
    const applied: string[] = [];
    const errors: string[] = [];

    try {
      // Check connection pool settings
      const poolRecommendations = await this.analyzeConnectionPool();
      recommendations.push(...poolRecommendations);

      // Check query cache settings
      const cacheRecommendations = await this.analyzeCacheConfiguration();
      recommendations.push(...cacheRecommendations);

      // Check index maintenance
      const indexMaintenance = await this.checkIndexMaintenance();
      recommendations.push(...indexMaintenance);

      // Apply safe optimizations automatically
      for (const recommendation of recommendations) {
        if (recommendation.includes('REINDEX') || recommendation.includes('ANALYZE')) {
          try {
            await this.prisma.$executeRawUnsafe(recommendation);
            applied.push(recommendation);
          } catch (error: any) {
            errors.push(`${recommendation}: ${error.message}`);
          }
        }
      }

      return { recommendations, applied, errors };
    } catch (error) {
      logger.error('Configuration optimization error:', error);
      return { recommendations, applied, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  /**
   * Monitor query performance
   */
  static recordQuery(query: string, duration: number): void {
    const stats = this.queryStats.get(query) || { count: 0, totalTime: 0, lastExecuted: new Date() };
    stats.count++;
    stats.totalTime += duration;
    stats.lastExecuted = new Date();
    
    this.queryStats.set(query, stats);

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      logger.warn('Slow query detected', {
        query: query.substring(0, 200),
        duration,
        count: stats.count,
      });
    }
  }

  /**
   * Get query execution plan
   */
  static async getExecutionPlan(query: string): Promise<any[]> {
    try {
      const plan = await this.prisma.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`);
      return plan as any[];
    } catch (error) {
      logger.error('Execution plan error:', error);
      return [];
    }
  }

  /**
   * Vacuum and analyze tables
   */
  static async maintainTables(): Promise<{ success: string[]; errors: string[] }> {
    const success: string[] = [];
    const errors: string[] = [];

    try {
      // Get all table names
      const tables = await this.prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `;

      for (const table of tables) {
        try {
          // Vacuum and analyze each table
          await this.prisma.$executeRawUnsafe(`VACUUM ANALYZE "${table.tablename}"`);
          success.push(table.tablename);
        } catch (error: any) {
          errors.push(`${table.tablename}: ${error.message}`);
        }
      }

      logger.info(`Table maintenance completed: ${success.length} success, ${errors.length} errors`);
      return { success, errors };
    } catch (error) {
      logger.error('Table maintenance error:', error);
      return { success, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  /**
   * Get slow queries from PostgreSQL stats
   */
  private static async getSlowQueries(): Promise<Array<{ query: string; calls: number; mean_time: number }>> {
    try {
      const slowQueries = await this.prisma.$queryRaw<Array<{
        query: string;
        calls: number;
        mean_time: number;
      }>>`
        SELECT query, calls, mean_time
        FROM pg_stat_statements
        WHERE mean_time > ${this.slowQueryThreshold}
        ORDER BY mean_time DESC
        LIMIT 20
      `;
      
      return slowQueries;
    } catch (error) {
      // pg_stat_statements might not be enabled
      logger.warn('pg_stat_statements not available, using internal stats');
      
      // Use internal query stats
      return Array.from(this.queryStats.entries())
        .filter(([_, stats]) => stats.totalTime / stats.count > this.slowQueryThreshold)
        .map(([query, stats]) => ({
          query,
          calls: stats.count,
          mean_time: stats.totalTime / stats.count,
        }))
        .sort((a, b) => b.mean_time - a.mean_time)
        .slice(0, 20);
    }
  }

  /**
   * Optimize individual query
   */
  private static async optimizeQuery(queryInfo: { query: string; calls: number; mean_time: number }): Promise<QueryOptimizationResult | null> {
    const recommendations: string[] = [];
    let optimizedQuery = queryInfo.query;
    let estimatedImprovement = 0;

    // Basic query optimization rules
    if (queryInfo.query.includes('SELECT *')) {
      recommendations.push('Avoid SELECT *, specify only needed columns');
      optimizedQuery = optimizedQuery.replace('SELECT *', 'SELECT specific_columns');
      estimatedImprovement += 20;
    }

    if (queryInfo.query.includes('LIKE \'%')) {
      recommendations.push('Avoid leading wildcards in LIKE queries, consider full-text search');
      estimatedImprovement += 30;
    }

    if (queryInfo.query.includes('ORDER BY') && !queryInfo.query.includes('LIMIT')) {
      recommendations.push('Consider adding LIMIT to ORDER BY queries');
      estimatedImprovement += 15;
    }

    if (queryInfo.query.includes('IN (SELECT')) {
      recommendations.push('Consider using EXISTS instead of IN with subquery');
      optimizedQuery = optimizedQuery.replace(/IN \(SELECT/g, 'EXISTS (SELECT 1 FROM');
      estimatedImprovement += 25;
    }

    if (recommendations.length === 0) {
      return null;
    }

    return {
      originalQuery: queryInfo.query,
      optimizedQuery,
      estimatedImprovement,
      recommendations,
    };
  }

  /**
   * Analyze query patterns for index recommendations
   */
  private static async analyzeQueryPatterns(): Promise<void> {
    // This would analyze actual query patterns from logs
    // For now, we'll use the recorded query stats
    for (const [query, stats] of this.queryStats.entries()) {
      if (stats.count > 100 && stats.totalTime / stats.count > 100) {
        logger.info('Frequent slow query detected', {
          query: query.substring(0, 100),
          count: stats.count,
          averageTime: stats.totalTime / stats.count,
        });
      }
    }
  }

  /**
   * Check for missing foreign key indexes
   */
  private static async checkForeignKeyIndexes(): Promise<IndexRecommendation[]> {
    try {
      const missingIndexes = await this.prisma.$queryRaw<Array<{
        table_name: string;
        column_name: string;
        constraint_name: string;
      }>>`
        SELECT 
          tc.table_name,
          kcu.column_name,
          tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN pg_indexes pi 
          ON tc.table_name = pi.tablename 
          AND kcu.column_name = ANY(string_to_array(replace(pi.indexdef, ' ', ''), ','))
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND pi.indexname IS NULL
      `;

      return missingIndexes.map(index => ({
        table: index.table_name,
        columns: [index.column_name],
        type: 'btree' as const,
        reason: `Missing index on foreign key column '${index.column_name}'`,
        estimatedImpact: 'high' as const,
      }));
    } catch (error) {
      logger.error('Foreign key index check error:', error);
      return [];
    }
  }

  /**
   * Find composite index opportunities
   */
  private static async findCompositeIndexOpportunities(): Promise<IndexRecommendation[]> {
    // This would analyze query patterns to find columns frequently used together
    // For now, return common composite index recommendations
    return [
      {
        table: 'properties',
        columns: ['country', 'property_type', 'status'],
        type: 'btree',
        reason: 'Frequently filtered together in property searches',
        estimatedImpact: 'high',
      },
      {
        table: 'properties',
        columns: ['price', 'created_at'],
        type: 'btree',
        reason: 'Common for price range and date filtering',
        estimatedImpact: 'medium',
      },
      {
        table: 'users',
        columns: ['email', 'status'],
        type: 'btree',
        reason: 'Login queries filter by email and check status',
        estimatedImpact: 'medium',
      },
    ];
  }

  /**
   * Find unused indexes
   */
  private static async findUnusedIndexes(): Promise<Array<{ table: string; name: string; column: string }>> {
    try {
      const unusedIndexes = await this.prisma.$queryRaw<Array<{
        schemaname: string;
        tablename: string;
        indexname: string;
        idx_scan: number;
      }>>`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
          AND indexname NOT LIKE '%_pkey'
        ORDER BY schemaname, tablename, indexname
      `;

      return unusedIndexes.map(index => ({
        table: index.tablename,
        name: index.indexname,
        column: index.indexname, // Simplified - would need to parse actual columns
      }));
    } catch (error) {
      logger.error('Unused index check error:', error);
      return [];
    }
  }

  /**
   * Get query statistics
   */
  private static async getQueryStatistics(): Promise<{
    total: number;
    slow: number;
    averageTime: number;
  }> {
    const stats = Array.from(this.queryStats.values());
    const total = stats.reduce((sum, stat) => sum + stat.count, 0);
    const totalTime = stats.reduce((sum, stat) => sum + stat.totalTime, 0);
    const slow = stats.filter(stat => stat.totalTime / stat.count > this.slowQueryThreshold).length;

    return {
      total,
      slow,
      averageTime: total > 0 ? totalTime / total : 0,
    };
  }

  /**
   * Get connection statistics
   */
  private static async getConnectionStatistics(): Promise<{ usage: number }> {
    try {
      const connections = await this.prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*) as count FROM pg_stat_activity WHERE state = 'active'
      `;
      
      // Assuming max connections is 100 (default PostgreSQL setting)
      const maxConnections = 100;
      const activeConnections = connections[0]?.count || 0;
      
      return {
        usage: Math.round((activeConnections / maxConnections) * 100),
      };
    } catch (error) {
      logger.error('Connection stats error:', error);
      return { usage: 0 };
    }
  }

  /**
   * Get table statistics
   */
  private static async getTableStatistics(): Promise<Array<{
    table: string;
    rowCount: number;
    size: string;
    indexCount: number;
  }>> {
    try {
      const tableStats = await this.prisma.$queryRaw<Array<{
        table_name: string;
        row_count: bigint;
        table_size: string;
        index_count: bigint;
      }>>`
        SELECT 
          t.table_name,
          COALESCE(s.n_tup_ins + s.n_tup_upd + s.n_tup_del, 0) as row_count,
          pg_size_pretty(pg_total_relation_size(c.oid)) as table_size,
          COUNT(i.indexname) as index_count
        FROM information_schema.tables t
        LEFT JOIN pg_class c ON c.relname = t.table_name
        LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
        LEFT JOIN pg_indexes i ON i.tablename = t.table_name
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
        GROUP BY t.table_name, s.n_tup_ins, s.n_tup_upd, s.n_tup_del, c.oid
        ORDER BY pg_total_relation_size(c.oid) DESC
      `;

      return tableStats.map(stat => ({
        table: stat.table_name,
        rowCount: Number(stat.row_count),
        size: stat.table_size,
        indexCount: Number(stat.index_count),
      }));
    } catch (error) {
      logger.error('Table stats error:', error);
      return [];
    }
  }

  /**
   * Get index usage statistics
   */
  private static async getIndexStatistics(): Promise<Record<string, number>> {
    try {
      const indexStats = await this.prisma.$queryRaw<Array<{
        indexname: string;
        idx_scan: bigint;
      }>>`
        SELECT indexname, idx_scan
        FROM pg_stat_user_indexes
        ORDER BY idx_scan DESC
      `;

      const stats: Record<string, number> = {};
      indexStats.forEach(stat => {
        stats[stat.indexname] = Number(stat.idx_scan);
      });

      return stats;
    } catch (error) {
      logger.error('Index stats error:', error);
      return {};
    }
  }

  /**
   * Analyze connection pool configuration
   */
  private static async analyzeConnectionPool(): Promise<string[]> {
    const recommendations: string[] = [];
    
    try {
      const connections = await this.prisma.$queryRaw<Array<{ count: number; state: string }>>`
        SELECT COUNT(*) as count, state
        FROM pg_stat_activity
        GROUP BY state
      `;

      const activeConnections = connections.find(c => c.state === 'active')?.count || 0;
      const idleConnections = connections.find(c => c.state === 'idle')?.count || 0;

      if (idleConnections > activeConnections * 2) {
        recommendations.push('Consider reducing connection pool size - too many idle connections');
      }

      if (activeConnections > 50) {
        recommendations.push('High number of active connections - consider connection pooling optimization');
      }
    } catch (error) {
      logger.error('Connection pool analysis error:', error);
    }

    return recommendations;
  }

  /**
   * Analyze cache configuration
   */
  private static async analyzeCacheConfiguration(): Promise<string[]> {
    const recommendations: string[] = [];
    
    try {
      const cacheStats = await CacheService.getStats();
      
      if (cacheStats.hitRate < 0.7) {
        recommendations.push('Cache hit rate is low - consider increasing cache TTL or warming up cache');
      }

      if (cacheStats.evictions > cacheStats.hits * 0.1) {
        recommendations.push('High cache eviction rate - consider increasing cache memory');
      }
    } catch (error) {
      logger.error('Cache configuration analysis error:', error);
    }

    return recommendations;
  }

  /**
   * Check index maintenance needs
   */
  private static async checkIndexMaintenance(): Promise<string[]> {
    const recommendations: string[] = [];
    
    try {
      // Check for bloated indexes
      const bloatedIndexes = await this.prisma.$queryRaw<Array<{
        indexname: string;
        bloat_ratio: number;
      }>>`
        SELECT 
          indexname,
          (pg_relation_size(indexname::regclass) / NULLIF(pg_relation_size(tablename::regclass), 0)) as bloat_ratio
        FROM pg_indexes
        WHERE schemaname = 'public'
        HAVING (pg_relation_size(indexname::regclass) / NULLIF(pg_relation_size(tablename::regclass), 0)) > 0.2
      `;

      bloatedIndexes.forEach(index => {
        recommendations.push(`REINDEX INDEX ${index.indexname}; -- Bloated index (${Math.round(index.bloat_ratio * 100)}% of table size)`);
      });

      // Recommend regular ANALYZE
      recommendations.push('ANALYZE; -- Update table statistics');
    } catch (error) {
      logger.error('Index maintenance check error:', error);
    }

    return recommendations;
  }
}

// Middleware to record query performance
export const queryPerformanceMiddleware = (query: string, duration: number) => {
  DatabaseOptimizationService.recordQuery(query, duration);
};