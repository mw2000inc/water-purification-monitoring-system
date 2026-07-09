import { supabase } from "@/lib/supabase/client"
import type { Contract } from "@/lib/types"

type ContractRow = {
  id: string
  customer_id: string
  contract_number: string
  start_date: string
  end_date: string
}

function fromRow(row: ContractRow): Contract {
  return {
    id: row.id,
    customerId: row.customer_id,
    contractNumber: row.contract_number,
    startDate: row.start_date,
    endDate: row.end_date,
  }
}

export async function listContracts(): Promise<Contract[]> {
  const { data, error } = await supabase.from("contracts").select("*")
  if (error) throw error
  return (data as ContractRow[]).map(fromRow)
}
