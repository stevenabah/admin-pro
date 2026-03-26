<template>
  <div class="data-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>表格编辑</span>
          <el-button type="primary" @click="handleAdd">新增数据</el-button>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="搜索标题/内容" clearable />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="searchForm.category" clearable placeholder="全部">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" border stripe>
        <el-table-column prop="title" label="标题" min-width="150">
          <template #default="{ row }">
            <el-input v-if="row._edit" v-model="row.title" size="small" />
            <span v-else>{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="内容" min-width="200">
          <template #default="{ row }">
            <el-input v-if="row._edit" v-model="row.content" size="small" />
            <span v-else>{{ row.content }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="100">
          <template #default="{ row }">
            <el-select v-if="row._edit" v-model="row.category" size="small">
              <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
            </el-select>
            <el-tag v-else size="small">{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="{ row }">
            <el-input-number v-if="row._edit" v-model="row.amount" :precision="2" :min="0" size="small" style="width: 100px" />
            <span v-else>¥{{ row.amount?.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-switch v-if="row._edit" v-model="row.status" :active-value="1" :inactive-value="0" size="small" />
            <el-tag v-else :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <template v-if="row._edit">
              <el-button type="success" size="small" @click="handleSave(row)">保存</el-button>
              <el-button size="small" @click="row._edit = false; fetchData()">取消</el-button>
            </template>
            <template v-else>
              <el-button type="primary" size="small" @click="row._edit = true">编辑</el-button>
              <el-button type="danger" size="small" @click="handleDelete(row.id)">删除</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 20px; text-align: right"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑数据' : '新增数据'" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input-number v-model="form.amount" :precision="2" :min="0" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus'
import { api } from '@/stores/user'

const tableData = ref<any[]>([])
const categories = ['产品', '订单', '库存', '财务', '客户']
const searchForm = reactive({ keyword: '', category: '' })
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  id: '',
  title: '',
  content: '',
  category: '产品',
  amount: 0,
  status: 1
})

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }]
}

const fetchData = async () => {
  const res = await api.get('/data', {
    params: { page: pagination.page, pageSize: pagination.pageSize, keyword: searchForm.keyword, category: searchForm.category }
  })
  if (res.code === 200) {
    tableData.value = res.data.list.map((item: any) => ({ ...item, _edit: false }))
    pagination.total = res.data.total
  }
}

const resetSearch = () => {
  searchForm.keyword = ''
  searchForm.category = ''
  fetchData()
}

const handleAdd = () => {
  Object.assign(form, { id: '', title: '', content: '', category: '产品', amount: 0, status: 1 })
  isEdit.value = false
  dialogVisible.value = true
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  const url = isEdit.value ? `/data/${form.id}` : '/data'
  const method = isEdit.value ? 'put' : 'post'
  const res = await api[method](url, form)
  if (res.code === 200) {
    ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
    dialogVisible.value = false
    fetchData()
  }
}

const handleSave = async (row: any) => {
  const res = await api.put(`/data/${row.id}`, row)
  if (res.code === 200) {
    ElMessage.success('保存成功')
    row._edit = false
    fetchData()
  }
}

const handleDelete = (id: string) => {
  ElMessageBox.confirm('确定要删除该数据吗？', '提示', { type: 'warning' }).then(async () => {
    const res = await api.delete(`/data/${id}`)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      fetchData()
    }
  })
}

const formatDate = (date: string) => new Date(date).toLocaleDateString('zh-CN')

onMounted(() => fetchData())
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>