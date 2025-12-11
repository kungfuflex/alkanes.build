-- Batch pool candle data fetching for AMM pools
-- This script fetches pool reserves at multiple block heights in a single evalscript call
-- to efficiently build OHLC candle data for price charts
--
-- Args:
--   [1] pool_id: string - Pool contract ID in "block:tx" format (e.g., "2:77087")
--   [2] start_height: number - Starting block height
--   [3] end_height: number - Ending block height
--   [4] interval: number - Block interval between samples (e.g., 144 for daily)
--
-- Returns: Array of {height, reserve_a, reserve_b, total_supply} objects

local pool_id = args[1]
local start_height = tonumber(args[2])
local end_height = tonumber(args[3])
local interval = tonumber(args[4]) or 144

-- Validate inputs
if not pool_id or not start_height or not end_height then
    return { error = "Missing required arguments: pool_id, start_height, end_height" }
end

if start_height > end_height then
    return { error = "start_height must be <= end_height" }
end

-- Parse pool_id into block and tx
local pool_block, pool_tx = pool_id:match("(%d+):(%d+)")
if not pool_block or not pool_tx then
    return { error = "Invalid pool_id format. Expected 'block:tx'" }
end

pool_block = tonumber(pool_block)
pool_tx = tonumber(pool_tx)

-- Build calldata for opcode 999 (POOL_DETAILS)
-- Format: LEB128(target_block) + LEB128(target_tx) + LEB128(opcode)
local function leb128_encode(value)
    local result = {}
    repeat
        local byte = value % 128
        value = math.floor(value / 128)
        if value > 0 then
            byte = byte + 128
        end
        table.insert(result, byte)
    until value == 0
    return result
end

local function build_calldata()
    local calldata = {}
    -- Target alkane block
    for _, b in ipairs(leb128_encode(pool_block)) do
        table.insert(calldata, b)
    end
    -- Target alkane tx
    for _, b in ipairs(leb128_encode(pool_tx)) do
        table.insert(calldata, b)
    end
    -- Opcode 999 (POOL_DETAILS)
    for _, b in ipairs(leb128_encode(999)) do
        table.insert(calldata, b)
    end
    return calldata
end

local calldata = build_calldata()

-- Result array
local results = {
    pool_id = pool_id,
    start_height = start_height,
    end_height = end_height,
    interval = interval,
    data_points = {}
}

-- Query pool state at each interval
for height = start_height, end_height, interval do
    local block_tag = tostring(height)

    -- Call alkanes_simulate with block_tag for historical query
    local success, response = pcall(function()
        return _RPC.alkanes_simulate({
            alkaneId = pool_id,
            inputs = {},
            calldata = calldata,
            vout = 0,
            pointer = 0,
            refundPointer = 0,
            target = pool_id,
            blockTag = block_tag
        })
    end)

    if success and response and response.execution and response.execution.data then
        -- Parse the response data (hex string)
        -- Format: token_a(32) + token_b(32) + reserve_a(16) + reserve_b(16) + total_supply(16) + name_len(4) + name
        local data_hex = response.execution.data
        if data_hex and #data_hex > 2 then
            -- Remove 0x prefix if present
            if data_hex:sub(1, 2) == "0x" then
                data_hex = data_hex:sub(3)
            end

            -- Parse reserves (at bytes 64-80 and 80-96 in the response)
            -- Each u128 is 16 bytes = 32 hex chars
            if #data_hex >= 192 then -- Need at least 96 bytes = 192 hex chars
                -- reserve_a is at offset 64 (128 hex chars from start)
                local reserve_a_hex = data_hex:sub(129, 160) -- bytes 64-80
                -- reserve_b is at offset 80 (160 hex chars from start)
                local reserve_b_hex = data_hex:sub(161, 192) -- bytes 80-96
                -- total_supply is at offset 96 (192 hex chars from start)
                local total_supply_hex = data_hex:sub(193, 224) -- bytes 96-112

                -- Convert little-endian hex to numbers (simplified - may overflow for large values)
                local function hex_le_to_number(hex_str)
                    if not hex_str or #hex_str == 0 then return 0 end
                    -- Reverse bytes for little-endian
                    local reversed = ""
                    for i = #hex_str - 1, 1, -2 do
                        reversed = reversed .. hex_str:sub(i, i + 1)
                    end
                    return tonumber(reversed, 16) or 0
                end

                table.insert(results.data_points, {
                    height = height,
                    reserve_a = hex_le_to_number(reserve_a_hex),
                    reserve_b = hex_le_to_number(reserve_b_hex),
                    total_supply = hex_le_to_number(total_supply_hex)
                })
            end
        end
    end
end

results.count = #results.data_points
return results
