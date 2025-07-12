-- CreateTable
CREATE TABLE "ApolloQuery" (
    "id" SERIAL NOT NULL,
    "query" TEXT NOT NULL,
    "apolloQuery" JSONB NOT NULL,
    "maxPage" INTEGER NOT NULL,
    "pageLastFetched" INTEGER NOT NULL,

    CONSTRAINT "ApolloQuery_pkey" PRIMARY KEY ("id")
);
