import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import 'dotenv/config'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const questionId = "e98b584d-2a1c-4b6d-a7f4-3d9a1c6e8f42"
  
  const question = await prisma.question.upsert({
    where: { id: questionId },
    update: {},
    create: {
      id: questionId,
      category: "DSA",
      subtopic: "Arrays & Hashing",
      difficulty: "Easy",
      title: "Two Sum",
      description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
      testCases: [
        {
          "input": {
            "nums": [2, 7, 11, 15],
            "target": 9
          },
          "expectedOutput": [0, 1]
        },
        {
          "input": {
            "nums": [3, 2, 4],
            "target": 6
          },
          "expectedOutput": [1, 2]
        },
        {
          "input": {
            "nums": [3, 3],
            "target": 6
          },
          "expectedOutput": [0, 1]
        },
        {
          "input": {
            "nums": [0, 4, 3, 0],
            "target": 0
          },
          "expectedOutput": [0, 3]
        },
        {
          "input": {
            "nums": [-1, -2, -3, -4, -5],
            "target": -8
          },
          "expectedOutput": [2, 4]
        },
        {
          "input": {
            "nums": [150, 24, 79, 50, 88, 345, 3],
            "target": 200
          },
          "expectedOutput": [0, 3]
        },
        {
          "input": {
            "nums": [5, 75, 25],
            "target": 100
          },
          "expectedOutput": [1, 2]
        },
        {
          "input": {
            "nums": [2, 1, 9, 4, 4, 56, 90, 3],
            "target": 8
          },
          "expectedOutput": [3, 4]
        },
        {
          "input": {
            "nums": [-10, 7, 19, 15],
            "target": 9
          },
          "expectedOutput": [0, 2]
        },
        {
          "input": {
            "nums": [3, 2, 95, 4, -3],
            "target": 92
          },
          "expectedOutput": [2, 4]
        }
      ]
    }
  })

  console.log("Database seeded successfully with 'Two Sum' question!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
