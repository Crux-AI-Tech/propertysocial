
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  firstName: 'firstName',
  lastName: 'lastName',
  phone: 'phone',
  avatar: 'avatar',
  role: 'role',
  isVerified: 'isVerified',
  isActive: 'isActive',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  bio: 'bio',
  company: 'company',
  website: 'website',
  country: 'country',
  city: 'city',
  language: 'language',
  currency: 'currency',
  timezone: 'timezone',
  emailNotifications: 'emailNotifications',
  smsNotifications: 'smsNotifications',
  pushNotifications: 'pushNotifications',
  marketingEmails: 'marketingEmails',
  emailVerified: 'emailVerified',
  phoneVerified: 'phoneVerified',
  verificationToken: 'verificationToken',
  tokenExpiresAt: 'tokenExpiresAt'
};

exports.Prisma.PropertyScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  price: 'price',
  currency: 'currency',
  propertyType: 'propertyType',
  listingType: 'listingType',
  status: 'status',
  isActive: 'isActive',
  isFeatured: 'isFeatured',
  viewCount: 'viewCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  publishedAt: 'publishedAt',
  expiresAt: 'expiresAt',
  ownerId: 'ownerId',
  street: 'street',
  city: 'city',
  postcode: 'postcode',
  county: 'county',
  country: 'country',
  latitude: 'latitude',
  longitude: 'longitude',
  bedrooms: 'bedrooms',
  bathrooms: 'bathrooms',
  receptionRooms: 'receptionRooms',
  floorArea: 'floorArea',
  plotSize: 'plotSize',
  floors: 'floors',
  buildYear: 'buildYear',
  energyRating: 'energyRating',
  furnished: 'furnished',
  garden: 'garden',
  parking: 'parking',
  garage: 'garage',
  balcony: 'balcony',
  terrace: 'terrace',
  elevator: 'elevator',
  airConditioning: 'airConditioning',
  heating: 'heating',
  petFriendly: 'petFriendly'
};

exports.Prisma.PropertyImageScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  url: 'url',
  altText: 'altText',
  caption: 'caption',
  order: 'order',
  isMain: 'isMain',
  createdAt: 'createdAt'
};

exports.Prisma.PropertyTagScalarFieldEnum = {
  id: 'id',
  name: 'name',
  category: 'category',
  description: 'description',
  color: 'color',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PropertyToTagScalarFieldEnum = {
  propertyId: 'propertyId',
  tagId: 'tagId',
  createdAt: 'createdAt'
};

exports.Prisma.TransactionScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  buyerId: 'buyerId',
  sellerId: 'sellerId',
  agentId: 'agentId',
  type: 'type',
  status: 'status',
  offerAmount: 'offerAmount',
  finalAmount: 'finalAmount',
  currency: 'currency',
  commission: 'commission',
  commissionRate: 'commissionRate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  offerDate: 'offerDate',
  acceptedDate: 'acceptedDate',
  completionDate: 'completionDate',
  expectedCompletion: 'expectedCompletion',
  notes: 'notes',
  terms: 'terms',
  metadata: 'metadata'
};

exports.Prisma.SavedSearchScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  name: 'name',
  criteria: 'criteria',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PropertyFavoriteScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  propertyId: 'propertyId',
  notes: 'notes',
  createdAt: 'createdAt'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  senderId: 'senderId',
  receiverId: 'receiverId',
  transactionId: 'transactionId',
  subject: 'subject',
  content: 'content',
  isRead: 'isRead',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  status: 'status',
  title: 'title',
  content: 'content',
  data: 'data',
  sentAt: 'sentAt',
  readAt: 'readAt',
  createdAt: 'createdAt'
};

exports.Prisma.ReviewScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  reviewerId: 'reviewerId',
  targetId: 'targetId',
  rating: 'rating',
  title: 'title',
  content: 'content',
  isVerified: 'isVerified',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OfferScalarFieldEnum = {
  id: 'id',
  transactionId: 'transactionId',
  offererId: 'offererId',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  message: 'message',
  conditions: 'conditions',
  validUntil: 'validUntil',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  respondedAt: 'respondedAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  action: 'action',
  resource: 'resource',
  resourceId: 'resourceId',
  oldData: 'oldData',
  newData: 'newData',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  User: 'User',
  Property: 'Property',
  PropertyImage: 'PropertyImage',
  PropertyTag: 'PropertyTag',
  PropertyToTag: 'PropertyToTag',
  Transaction: 'Transaction',
  SavedSearch: 'SavedSearch',
  PropertyFavorite: 'PropertyFavorite',
  Message: 'Message',
  Notification: 'Notification',
  Review: 'Review',
  Offer: 'Offer',
  AuditLog: 'AuditLog'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
